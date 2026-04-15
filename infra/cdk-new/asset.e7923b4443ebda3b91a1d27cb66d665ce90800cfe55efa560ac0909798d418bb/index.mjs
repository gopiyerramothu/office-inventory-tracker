import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  RekognitionClient,
  DetectLabelsCommand,
  DetectTextCommand,
} from "@aws-sdk/client-rekognition";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const rekognition = new RekognitionClient({});
const TABLE = process.env.TABLE_NAME;
const USERS_TABLE = process.env.USERS_TABLE_NAME;
const BUCKET = process.env.IMAGE_BUCKET;

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export const handler = async (event) => {
  const { httpMethod, resource, body, queryStringParameters, pathParameters } =
    event;

  try {
    // GET /items — list all inventory
    if (httpMethod === "GET" && resource === "/items") {
      const { Items = [] } = await ddb.send(
        new ScanCommand({ TableName: TABLE })
      );
      return { statusCode: 200, headers, body: JSON.stringify(Items) };
    }

    // POST /items — add new item
    if (httpMethod === "POST" && resource === "/items") {
      const data = JSON.parse(body);
      const item = {
        id: randomUUID(),
        userName: data.userName || "Anonymous",
        itemName: data.itemName,
        description: data.description || "",
        itemType: data.itemType || "Electronics",
        serialNumber: data.serialNumber || "",
        status: data.status || "Working",
        location: data.location || "Suite 180",
        notes: data.notes || "",
        imageUrl: data.imageUrl || null,
        createdAt: new Date().toISOString(),
      };
      await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
      return { statusCode: 201, headers, body: JSON.stringify(item) };
    }

    // DELETE /items/{id}
    if (httpMethod === "DELETE" && resource === "/items/{id}") {
      await ddb.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { id: pathParameters.id },
        })
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ deleted: true }),
      };
    }

    // GET /upload-url — get presigned URL for image upload
    if (httpMethod === "GET" && resource === "/upload-url") {
      const key = `uploads/${randomUUID()}.jpg`;
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: 300 }
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ uploadUrl: url, key }),
      };
    }

    // POST /detect — detect equipment + read text from image
    if (httpMethod === "POST" && resource === "/detect") {
      const { key } = JSON.parse(body);
      const s3Image = { S3Object: { Bucket: BUCKET, Name: key } };

      // Run label detection and text detection in parallel
      const [labelResult, textResult] = await Promise.all([
        rekognition.send(
          new DetectLabelsCommand({
            Image: s3Image,
            MaxLabels: 15,
            MinConfidence: 60,
          })
        ),
        rekognition.send(
          new DetectTextCommand({
            Image: s3Image,
          })
        ),
      ]);

      const labels = (labelResult.Labels || []).map((l) => ({
        name: l.Name,
        confidence: Math.round(l.Confidence),
      }));

      // Extract all detected text lines
      const textLines = (textResult.TextDetections || [])
        .filter((t) => t.Type === "LINE" && t.Confidence > 60)
        .map((t) => t.DetectedText);

      // Try to intelligently parse fields from detected text
      const allText = textLines.join(" ");
      const parsed = {};

      // Look for serial number patterns (SN:, S/N, serial, or alphanumeric codes)
      const snMatch = allText.match(
        /(?:S\/?N|Serial|SN)[:\s#-]*([A-Z0-9][\w-]{4,})/i
      );
      if (snMatch) parsed.serialNumber = snMatch[1];

      // Look for model number patterns
      const modelMatch = allText.match(
        /(?:Model|MDL|MOD)[:\s#-]*([A-Z0-9][\w-]{2,})/i
      );
      if (modelMatch) parsed.model = modelMatch[1];

      // Known brand names to look for
      const brands = [
        "Dell", "HP", "Lenovo", "Apple", "Samsung", "LG", "Asus",
        "Acer", "Microsoft", "Logitech", "Cisco", "Netgear",
        "Brother", "Canon", "Epson", "Sony", "Philips", "BenQ",
        "ViewSonic", "Zebra", "Honeywell", "Ingenico", "Verifone",
      ];
      for (const b of brands) {
        if (allText.toLowerCase().includes(b.toLowerCase())) {
          parsed.brand = b;
          break;
        }
      }

      // Try to find a product name from labels
      const equipmentLabels = labels.filter(
        (l) =>
          ![
            "Text", "Label", "Symbol", "Logo", "Number", "Word",
            "Page", "Paper", "Document",
          ].includes(l.name)
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          labels: equipmentLabels,
          textLines,
          parsed,
        }),
      };
    }

    // GET /users — list all users
    if (httpMethod === "GET" && resource === "/users") {
      const { Items = [] } = await ddb.send(new ScanCommand({ TableName: USERS_TABLE }));
      return { statusCode: 200, headers, body: JSON.stringify(Items) };
    }

    // POST /users — register/update a user login
    if (httpMethod === "POST" && resource === "/users") {
      const data = JSON.parse(body);
      const email = data.email?.toLowerCase();
      if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: "Email required" }) };

      // Check if user exists
      const existing = await ddb.send(new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: "email = :e",
        ExpressionAttributeValues: { ":e": email },
      }));

      if (existing.Items?.length > 0) {
        // Update last login
        const user = existing.Items[0];
        user.lastLogin = new Date().toISOString();
        user.name = data.name || user.name;
        user.picture = data.picture || user.picture;
        await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));
        return { statusCode: 200, headers, body: JSON.stringify(user) };
      }

      // New user
      const user = {
        id: randomUUID(),
        email,
        name: data.name || email,
        picture: data.picture || "",
        isAdmin: false,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));
      return { statusCode: 201, headers, body: JSON.stringify(user) };
    }

    // PUT /users/{id} — toggle admin
    if (httpMethod === "PUT" && resource === "/users/{id}") {
      const data = JSON.parse(body);
      const { Items = [] } = await ddb.send(new ScanCommand({
        TableName: USERS_TABLE,
        FilterExpression: "id = :id",
        ExpressionAttributeValues: { ":id": pathParameters.id },
      }));
      if (Items.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: "User not found" }) };
      const user = Items[0];
      user.isAdmin = !!data.isAdmin;
      await ddb.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));
      return { statusCode: 200, headers, body: JSON.stringify(user) };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
