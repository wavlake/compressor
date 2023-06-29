const AWS = require("aws-sdk");
const fs = require("fs");
const log = require("loglevel");

const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  region: "us-east-2",
});

const s3BucketName = `${process.env.AWS_S3_BUCKET_NAME}`;

async function getFromS3(objectKey, localFilePath) {
  const params = {
    Bucket: s3BucketName,
    Key: objectKey,
  };

  // Download file
  const content = (await s3.getObject(params).promise()).Body;

  // Write file
  fs.writeFile(localFilePath, content, (err) => {
    if (err) {
      log.debug(err);
    } else {
      return;
    }
  });
}

async function uploadS3(object) {
  return s3
    .upload(object, (err, data) => {
      if (err) {
        log.debug(`Error uploading to S3: ${err}`);
      }
    })
    .promise();
}

module.exports = {
  getFromS3,
  uploadS3,
};
