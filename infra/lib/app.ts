#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { InventoryStack } from "./inventory-stack";

const app = new cdk.App();
new InventoryStack(app, "OfficeInventoryStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
