# Office Inventory Tracker

A simple web portal for tracking office equipment. Share the link with your team — they can log equipment by scanning an image or entering details manually.

## Architecture

- **Frontend**: React app hosted on S3 + CloudFront
- **Backend**: API Gateway + Lambda (Node.js)
- **Database**: DynamoDB
- **Image Recognition**: Amazon Rekognition (optional, for scanning equipment)
- **Infrastructure**: AWS CDK (TypeScript)

## Getting Started

### Prerequisites

- Node.js 18+
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Deploy Infrastructure

```bash
cd infra
npm install
cdk deploy
```

## How It Works

1. Open the shared portal link
2. Add equipment by uploading a photo (auto-detects item) or typing details manually
3. View all tracked office inventory in a simple dashboard
