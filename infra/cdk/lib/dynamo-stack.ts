import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DynamoStackProps extends cdk.StackProps {
  tableName?: string;
}

export class DynamoStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: DynamoStackProps) {
    super(scope, id, props);

    const tableName = props?.tableName || 'Back2LifeTable';

    this.table = new dynamodb.Table(this, 'Back2LifeTable', {
      tableName,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: false,
    });

    // GSI1 — Providers by category and city (and other category lookups)
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: {
        name: 'GSI1PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI1SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2 — RepairData by issue for cross-device lookup (future-proofing per schema.md)
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: {
        name: 'GSI2PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'GSI2SK',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    new cdk.CfnOutput(this, 'Back2LifeTableName', {
      value: this.table.tableName,
      description: 'Back2Life DynamoDB Single-Table Name',
      exportName: 'Back2LifeTableName',
    });

    new cdk.CfnOutput(this, 'Back2LifeTableArn', {
      value: this.table.tableArn,
      description: 'Back2Life DynamoDB Table ARN',
      exportName: 'Back2LifeTableArn',
    });
  }
}
