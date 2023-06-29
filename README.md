# compressor

Serverless mp3 compression process for AWS Lambda

## overview

This Lambda function is meant to be triggered by a `PutObject` event on S3. The function reads the object and, presuming the object is an audio file, the function creates a compressed mp3 version of the file and uploads the new file to S3.

## development

### install

`npm install`

### setup

Use `aws configure` and set the proper access key and secret on your local machine.

### run tests

`npm run test`

## deployment

### build

`docker build -t compressor .`

### tag

`docker tag compressor <aws-account-id>.dkr.ecr.<region>.amazonaws.com/compressor:latest`

### push

`docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/compressor:latest`

Guide: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html#nodejs-image-instructions

NOTE: If building on an M1 Mac the architecture on the Lambda function should be set to `arm64`.
