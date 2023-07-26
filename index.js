const config = require("dotenv").config();
const Lame = require("node-lame").Lame;
const AWS = require("aws-sdk");
const fs = require("fs");
const log = require("loglevel");
log.setLevel(process.env.LOGLEVEL);
const db = require("./db");
const mp3Duration = require("mp3-duration");
const Sentry = require("@sentry/serverless");

const s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  region: "us-east-2",
});

Sentry.AWSLambda.init({
  dsn: `${process.env.SENTRY_DSN}`,
  environment: `${process.env.NODE_ENV}`,
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!,
});

const s3BucketName = `${process.env.AWS_S3_BUCKET_NAME}`;
const trackPrefix = `${process.env.AWS_S3_TRACK_PREFIX}`;
const localConvertPath = `${process.env.LOCAL_CONVERT_PATH}`;
const localUploadPath = `${process.env.LOCAL_UPLOAD_PATH}`;

const parseEvent = (event) => {
  const objectKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  const object = objectKey.match(
    /[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}.+/
  );

  const objectId = objectKey.match(
    /[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}/
  );
  return { objectId, objectKey, object };
};

// Handler
exports.handler = Sentry.AWSLambda.wrapHandler(
  async (event, context) => {
    try {
      // Synchronously create tmp storage dirs
      fs.mkdirSync(localConvertPath, { recursive: true }, (err) => {
        if (err) throw err;
      });

      fs.mkdirSync(localUploadPath, { recursive: true }, (err) => {
        if (err) throw err;
      });

      const { objectId, objectKey, object } = parseEvent(event);

      log.debug(`UUID: ${objectId}`);

      if (!objectId) {
        log.debug("No UUID found in key");
        return;
      }

      const localFilePath = `${localUploadPath}/${object}`;
      const localMP3Path = `${localConvertPath}/${objectId}.mp3`;

      log.debug("Downloading file from S3");
      const getObject = () => {
        return new Promise((resolve, reject) => {
          const params = {
            Bucket: s3BucketName,
            Key: objectKey,
          };

          log.debug(`Downloading ${objectKey} from S3`);
          // Download file
          const content = s3.getObject(params, function (err, data) {
            if (err) {
              reject(err);
            } else {
              resolve(data);
            }
          });
        });
      };

      // Write file
      const data = await getObject();

      const copyToLocal = () => {
        return new Promise((resolve, reject) => {
          fs.writeFile(localFilePath, data.Body, (err) => {
            if (err) {
              log.debug(err);
              reject();
            } else {
              resolve();
            }
          });
        });
      };

      const localCopy = await copyToLocal();

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

      const encodeFile = () => {
        return new Promise((resolve, reject) => {
          encoder.encode().then(() => {
            const object = {
              Bucket: s3BucketName,
              Key: s3Key,
              Body: fs.readFileSync(localMP3Path),
              ContentType: "audio/mpeg",
            };
            resolve(object);
          });
        });
      };

      const encodedFile = await encodeFile();

      const uploadFile = () => {
        return new Promise((resolve, reject) => {
          return s3.upload(encodedFile, (err, data) => {
            if (err) {
              log.debug(`Error uploading to S3: ${err}`);
              reject(err);
            }
            resolve(data);
          });
        });
      };

      const uploaded = await uploadFile();

      const duration = await mp3Duration(`${localMP3Path}`);
      const fileStats = await fs.promises.stat(`${localMP3Path}`);

      // Synchronously clean up temp storage dirs
      fs.rm(localConvertPath, { recursive: true, force: true }, (err) => {
        if (err) throw err;
      });

      fs.rm(localUploadPath, { recursive: true, force: true }, (err) => {
        if (err) throw err;
      });

      return db
        .knex("track")
        .update(
          {
            is_processing: false,
            duration: parseInt(duration),
            size: fileStats.size,
            updated_at: db.knex.fn.now(),
          },
          ["id"]
        )
        .where({ id: `${objectId}` })
        .then((data) => {
          if (data.length === 0) {
            log.debug(`No track found for id:${objectId}`);
            return "compressor error";

            return;
          }
          log.debug(`Db updated for track:${objectId}`);
          return "compressor success";
        })
        .catch((err) => {
          Sentry.captureException(err);
          log.debug(err);
          return "compressor error";
        });
    } catch (err) {
      Sentry.captureException(err);
      log.debug(err);

      const { objectId } = parseEvent(event);

      return db
        .knex("track")
        .update(
          {
            is_processing: false,
            compressor_error: err,
            updated_at: db.knex.fn.now(),
          },
          ["id"]
        )
        .where({ id: `${objectId}` })
        .then((data) => {
          if (data.length === 0) {
            log.debug(`No track found for id:${objectId}`);
            return "compressor error";
          }
          log.debug(`Db updated for track:${objectId}`);
          return "compressor error";
        })
        .catch((err) => {
          console.error(err);
          return "compressor error";
        });
    }
  },
  {
    // https://docs.sentry.io/platforms/node/guides/aws-lambda/#enable-timeout-warning
    captureTimeoutWarning: false,
  }
);
