# compressor

Serverless mp3 compression process for AWS Lambda

## overview

This Lambda function is meant to be triggered by a `PutObject` event on S3. The function reads in the object and, presuming the object is an audio file with a valid UUID, the function creates a compressed mp3 version of the file and uploads the new file to a different location in S3.

## development

### install

`npm install`

### setup

Use `aws configure` and set the proper access key and secret on your local machine.

### run tests

`npm run test`

## deployment

### build

`docker build -f Dockerfile.staging -t compressor-staging .`

For Prod:

`docker build -f Dockerfile.prod -t compressor-prod .`

### tag

`docker tag compressor-staging <aws-account-id>.dkr.ecr.<region>.amazonaws.com/compressor-staging:latest`

For Prod:

`docker tag compressor-prod <aws-account-id>.dkr.ecr.<region>.amazonaws.com/compressor-prod:latest`

### push

`docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/compressor-staging:latest`

For Prod:

`docker push <aws-account-id>.dkr.ecr.<region>.amazonaws.com/compressor-prod:latest`

To get authorization token:
`aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.<region>.amazonaws.com`

Guide: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html#nodejs-image-instructions

NOTE: If building on an M1 Mac the architecture on the Lambda function should be set to `arm64`.

## anecdotal performance

File: 40 MB wav
Duration: 28422.46 ms
Used: 262 MB Memory

File: 80 MB wav
Duration: 40420.39 ms
Used: 414 MB Memory
