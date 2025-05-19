import { packagePhpCode, PhpFpmFunction } from "@bref.sh/constructs";
import * as cdk from "aws-cdk-lib";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "Vpc", {
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: "private",
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: "public",
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const fn = new NodejsFunction(this, "Function", {
      entry: `${__dirname}/../lambda/function.ts`,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      vpc,
    });

    new cdk.CfnOutput(this, "FunctionName", {
      value: fn.functionArn,
    });

    const php = new PhpFpmFunction(this, "Php", {
      handler: `public/index.php`,
      code: packagePhpCode(`${__dirname}/../../app`),
      phpVersion: "8.3",
      environment: {
        APP_ENV: "prod",
        LAMBDA_ARN: fn.functionArn,
      },
      vpc,
    });

    fn.grantInvoke(php);

    const api = new LambdaRestApi(this, "Api", {
      handler: php,
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
    });
  }
}
