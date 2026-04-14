import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

export class InventoryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table for inventory items
    const table = new dynamodb.Table(this, "InventoryTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 bucket for uploaded equipment images
    const imageBucket = new s3.Bucket(this, "ImageBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // Lambda function for the API
    const apiHandler = new lambda.Function(this, "ApiHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../backend")),
      environment: {
        TABLE_NAME: table.tableName,
        IMAGE_BUCKET: imageBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant Lambda permissions
    table.grantReadWriteData(apiHandler);
    imageBucket.grantReadWrite(apiHandler);
    apiHandler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["rekognition:DetectLabels"],
        resources: ["*"],
      })
    );

    // API Gateway
    const api = new apigateway.RestApi(this, "InventoryApi", {
      restApiName: "Office Inventory API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const items = api.root.addResource("items");
    items.addMethod("GET", new apigateway.LambdaIntegration(apiHandler));
    items.addMethod("POST", new apigateway.LambdaIntegration(apiHandler));

    const singleItem = items.addResource("{id}");
    singleItem.addMethod("DELETE", new apigateway.LambdaIntegration(apiHandler));

    const upload = api.root.addResource("upload-url");
    upload.addMethod("GET", new apigateway.LambdaIntegration(apiHandler));

    const detect = api.root.addResource("detect");
    detect.addMethod("POST", new apigateway.LambdaIntegration(apiHandler));

    // S3 bucket for frontend hosting
    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    // Deploy frontend to S3
    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../../frontend/dist"))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    // Outputs
    new cdk.CfnOutput(this, "PortalUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: "Share this URL with your team",
    });
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API endpoint",
    });
  }
}
