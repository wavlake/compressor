const config = require("dotenv").config();
const Lame = require("node-lame").Lame;
const AWS = require("aws-sdk");
const fs = require("fs");
const log = require("loglevel");
log.setLevel(process.env.LOGLEVEL);

const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  region: "us-east-2",
});

const s3BucketName = `${process.env.AWS_S3_BUCKET_NAME}`;
const trackPrefix = `${process.env.AWS_S3_TRACK_PREFIX}`;
const localConvertPath = `${process.env.LOCAL_CONVERT_PATH}`;
const localUploadPath = `${process.env.LOCAL_UPLOAD_PATH}`;

// Handler
exports.handler = async function (event, context) {
  // Synchronously create tmp storage dirs
  fs.mkdirSync(localConvertPath, { recursive: true }, (err) => {
    if (err) throw err;
  });

  fs.mkdirSync(localUploadPath, { recursive: true }, (err) => {
    if (err) throw err;
  });

  const objectKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  const object = objectKey.match(
    /[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}.+/
  );

  const objectId = objectKey.match(
    /[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}/
  );

  log.debug(`UUID: ${objectId}`);

  if (!objectId) {
    log.debug("No UUID found in key");
    return;
  }

  const localFilePath = `${localUploadPath}/${object}`;
  const localMP3Path = `${localConvertPath}/${objectId}.mp3`;

  log.debug("Downloading file from S3");
  await getFromS3(objectKey, localFilePath);

  const encoder = new Lame({
    output: localMP3Path,
    bitrate: 128,
    mode: "j",
    // TODO: Add metadata support
    // meta: {
    //   title: request.title,
    //   artist: request.artistName,
    //   album: request.albumName,
    //   comment: "Wavlake",
    // },
  }).setFile(localFilePath);

  const s3Key = `${trackPrefix}/${objectId}.mp3`;

  await encoder.encode().then(() => {
    const object = {
      Bucket: s3BucketName,
      Key: s3Key,
      Body: fs.readFileSync(localMP3Path),
      ContentType: "audio/mpeg",
    };
    return uploadS3(object, (err, data) => {
      if (err) {
        log.debug(`Error uploading ${key} to S3: ${err}`);
      } else {
        log.debug(`Track ${objectId} uploaded to S3 ${data.Location}`);
      }
    });
  });
};

// S3 helpers
async function getFromS3(objectKey, localFilePath) {
  const params = {
    Bucket: s3BucketName,
    Key: objectKey,
  };

  log.debug(`Downloading ${objectKey} from S3`);
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
  log.debug(`Uploading ${object.Key} to S3`);
  return s3
    .upload(object, (err, data) => {
      if (err) {
        log.debug(`Error uploading to S3: ${err}`);
      }
    })
    .promise();
}
