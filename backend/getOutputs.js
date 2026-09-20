const { CloudFormationClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');

const client = new CloudFormationClient({ region: 'us-east-1' });

async function getOutputs() {
  const stacks = ['Back2LifeAuthStack-dev', 'Back2LifeApiStack-dev', 'Back2LifeDataStack-dev'];
  for (const stack of stacks) {
    try {
      const res = await client.send(new DescribeStacksCommand({ StackName: stack }));
      console.log(`\nOutputs for ${stack}:`);
      if (res.Stacks[0].Outputs) {
        res.Stacks[0].Outputs.forEach(o => console.log(`${o.OutputKey}: ${o.OutputValue}`));
      } else {
        console.log('No outputs found.');
      }
    } catch (err) {
      console.error(`Error describing stack ${stack}:`, err.message);
    }
  }
}

getOutputs();
