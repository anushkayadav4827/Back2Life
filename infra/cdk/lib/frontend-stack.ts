import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Hosting Bucket (Public Static Website)
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      publicReadAccess: true, // Allow public read for static hosting
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // For SPA routing
    });

    // 2. Deploy frontend dist directly to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../../frontend/dist'))],
      destinationBucket: siteBucket,
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: siteBucket.bucketWebsiteUrl,
      description: 'The URL of the deployed frontend (S3 Static Website)',
    });
  }
}
