import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';

export interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.ITable;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // 1. Create HTTP API
    this.httpApi = new apigwv2.HttpApi(this, 'Back2LifeHttpApi', {
      apiName: 'Back2Life API',
      corsPreflight: {
        allowOrigins: ['*'], // In production, restrict to frontend domain
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: cdk.Duration.days(10),
      },
    });

    // 1.5 Create JWT Authorizer
    const userPoolProviderUrl = `https://cognito-idp.${cdk.Stack.of(this).region}.amazonaws.com/${props.userPool.userPoolId}`;
    const jwtAuthorizer = new HttpJwtAuthorizer('Back2LifeAuthorizer', userPoolProviderUrl, {
      jwtAudience: [props.userPoolClient.userPoolClientId],
    });

    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        TABLE_NAME: props.table.tableName,
        GROQ_API_KEY: process.env.GROQ_API_KEY || '',
        GROQ_MODEL_ID: process.env.GROQ_MODEL_ID || '',
        SERPAPI_KEY: process.env.SERPAPI_KEY || '',
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
      timeout: cdk.Duration.seconds(30), // Bedrock calls might take a few seconds
    };

    const createLambda = (fnId: string, entry: string) => {
      return new nodejs.NodejsFunction(this, fnId, {
        ...commonLambdaProps,
        entry: path.join(__dirname, `../../../backend/src/handlers/${entry}`),
        handler: 'handler',
      });
    };

    // 2. Define Lambdas and Least Privilege IAM
    
    // listDevices
    const listDevicesFn = createLambda('ListDevicesFn', 'listDevices.ts');
    props.table.grantReadData(listDevicesFn);
    this.httpApi.addRoutes({
      path: '/devices',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('ListDevicesInt', listDevicesFn),
    });

    // getDevice
    const getDeviceFn = createLambda('GetDeviceFn', 'getDevice.ts');
    props.table.grantReadData(getDeviceFn);
    this.httpApi.addRoutes({
      path: '/devices/{id}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('GetDeviceInt', getDeviceFn),
    });

    // listProviders
    const listProvidersFn = createLambda('ListProvidersFn', 'listProviders.ts');
    props.table.grantReadData(listProvidersFn);
    
    // Grant listProviders read access to Google Places API key
    const placesSecret = secretsmanager.Secret.fromSecretNameV2(this, 'PlacesApiKey', 'back2life/places-api-key');
    placesSecret.grantRead(listProvidersFn);

    this.httpApi.addRoutes({
      path: '/providers',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('ListProvidersInt', listProvidersFn),
    });

    // startDiagnosis
    const startDiagnosisFn = createLambda('StartDiagnosisFn', 'startDiagnosis.ts');
    props.table.grantReadWriteData(startDiagnosisFn);
    this.httpApi.addRoutes({
      path: '/diagnosis/start',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('StartDiagnosisInt', startDiagnosisFn),
      authorizer: jwtAuthorizer,
    });

    // analyzeDiagnosis
    const analyzeDiagnosisFn = createLambda('AnalyzeDiagnosisFn', 'analyzeDiagnosis.ts');
    props.table.grantReadWriteData(analyzeDiagnosisFn);
    this.httpApi.addRoutes({
      path: '/diagnosis/analyze',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('AnalyzeDiagnosisInt', analyzeDiagnosisFn),
      authorizer: jwtAuthorizer,
    });

    // getDiagnosis
    const getDiagnosisFn = createLambda('GetDiagnosisFn', 'getDiagnosis.ts');
    props.table.grantReadData(getDiagnosisFn);
    this.httpApi.addRoutes({
      path: '/diagnosis/{id}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('GetDiagnosisInt', getDiagnosisFn),
      authorizer: jwtAuthorizer,
    });

    // listRepairHistory
    const listRepairHistoryFn = createLambda('ListRepairHistoryFn', 'listRepairHistory.ts');
    props.table.grantReadData(listRepairHistoryFn);
    this.httpApi.addRoutes({
      path: '/repair-history',
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration('ListRepairHistoryInt', listRepairHistoryFn),
      authorizer: jwtAuthorizer,
    });

    // saveRepairHistory
    const saveRepairHistoryFn = createLambda('SaveRepairHistoryFn', 'saveRepairHistory.ts');
    props.table.grantReadWriteData(saveRepairHistoryFn);
    this.httpApi.addRoutes({
      path: '/repair-history',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('SaveRepairHistoryInt', saveRepairHistoryFn),
      authorizer: jwtAuthorizer,
    });

    // getUploadUrl
    const getUploadUrlFn = createLambda('GetUploadUrlFn', 'getUploadUrl.ts');
    const bucketName = `back2life-uploads-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`;
    getUploadUrlFn.addEnvironment('UPLOAD_BUCKET', bucketName);
    // Allow getting presigned URL for this specific bucket
    getUploadUrlFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`arn:aws:s3:::${bucketName}/*`],
    }));
    this.httpApi.addRoutes({
      path: '/upload-url',
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration('GetUploadUrlInt', getUploadUrlFn),
    });

    this.apiUrl = this.httpApi.apiEndpoint;

    new cdk.CfnOutput(this, 'HttpApiUrl', {
      value: this.apiUrl,
      description: 'HTTP API Endpoint URL',
    });
  }
}
