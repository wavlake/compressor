# compressor

Serverless mp3 compression process for AWS Lambda

## overview

This Lambda function is meant to be triggered by a `PutObject` event on S3. The function reads the object and, presuming the object is a compatible audio file, creates a compressed mp3 version of the file and uploads the new file to S3.

## development

### install

`npm install`

### setup

Use `aws configure` and set the proper access key and secret on your local machine.

### run tests

`npm run test`

### package for deployment

`zip -r function.zip .`

### deploy

`aws lambda update-function-code --function-name my-function --zip-file fileb://function.zip`

## building the lame layer for lambda

1. Use an Amazon Linux EC2 instance for the following as it will best simulate the Lambda OS environment.
2. Download the tar from the LAME project site (as of 2023 this can be found at https://sourceforge.net/projects/lame/files/lame/3.100/lame-3.100.tar.gz/download). Untar the file
3. Build the binary according to the instructions: `./configure && make && make install`
4. Zip everything
5. Create a layer in Lambda with the zip file. Add it to the Lambda function.
