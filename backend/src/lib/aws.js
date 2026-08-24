require("dotenv").config();
const { S3Client }              = require("@aws-sdk/client-s3");
const { DynamoDBClient }        = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { TextractClient }        = require("@aws-sdk/client-textract");
const { BedrockRuntimeClient }  = require("@aws-sdk/client-bedrock-runtime");

const cfg = { region: process.env.AWS_REGION };

const s3        = new S3Client(cfg);
const textract  = new TextractClient(cfg);
const bedrock   = new BedrockRuntimeClient(cfg);
const dynamoRaw = new DynamoDBClient(cfg);
const dynamo    = DynamoDBDocumentClient.from(dynamoRaw);

module.exports = { s3, textract, bedrock, dynamo, dynamoRaw };
