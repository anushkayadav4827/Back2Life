const { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogGroupsCommand } = require('@aws-sdk/client-cloudwatch-logs');

const client = new CloudWatchLogsClient({ region: 'us-east-1' });

async function getLogs() {
  try {
    const lgRes = await client.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: '/aws/lambda/Back2LifeApiStack-dev-AnalyzeDiagnosisFn' }));
    const logGroup = lgRes.logGroups[0];
    if (!logGroup) {
      console.log('No log group found');
      return;
    }
    
    console.log('Fetching logs for:', logGroup.logGroupName);
    const filterRes = await client.send(new FilterLogEventsCommand({
      logGroupName: logGroup.logGroupName,
      startTime: Date.now() - 3600000 * 2, // last 2 hours
    }));
    
    if (filterRes.events) {
      filterRes.events.forEach(e => {
        if (e.message.includes('Bedrock') || e.message.includes('Zod')) {
           console.log(e.message);
        }
      });
    } else {
      console.log('No log events found.');
    }
  } catch (err) {
    console.error('Error fetching logs:', err.message);
  }
}

getLogs();
