import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';

export interface MonitoringStackProps extends cdk.StackProps {
  httpApi: apigwv2.HttpApi;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // 1. API Gateway 5XX Error Alarm
    const serverErrorMetric = props.httpApi.metricServerError({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    const errorAlarm = new cloudwatch.Alarm(this, 'Api5xxErrorAlarm', {
      metric: serverErrorMetric,
      threshold: 5, // Trigger if more than 5 errors in 5 minutes
      evaluationPeriods: 1,
      alarmDescription: 'Triggers if the API Gateway has too many 5XX errors',
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    new cdk.CfnOutput(this, 'AlarmName', {
      value: errorAlarm.alarmName,
    });
  }
}
