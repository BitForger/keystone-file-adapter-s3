const path = require('path');
const AWS = require('aws-sdk');
const urlJoin = require('url-join');

module.exports = class S3Adapter {
    constructor({
                    accessKeyId,
                    secretAccessKey,
                    region,
                    bucket,
                    folder,
                    publicUrl,
                    s3Options,
                    uploadParams,
                }) {
        if (!accessKeyId || !secretAccessKey || !region || !bucket || !folder) {
            throw new Error('S3Adapter requires accessKeyId, secretAccessKey, region, bucket, folder.');
        }
        this.s3 = new AWS.S3({
            accessKeyId,
            secretAccessKey,
            region,
            ...s3Options,
        });
        this.bucket = bucket;
        this.folder = folder;
        if (publicUrl) {
            this.publicUrl = publicUrl;
        }
        this.uploadParams = uploadParams || {};
    }

    save({stream, filename, id, mimetype, encoding}) {
        return new Promise(async (resolve, reject) => {
            let {uploadParams} = this;
            if (typeof this.uploadParams === 'function') {
                uploadParams = this.uploadParams({filename, id, mimetype, encoding});
            }
            this.s3.upload(
                {
                    Body: stream,
                    ContentType: mimetype,
                    Bucket: this.bucket,
                    Key: path.join(this.folder, filename),

                    ...uploadParams,
                },
                (error, data) => {
                    if (error) {
                        console.log('Error Uploading to S3', error);
                        reject(error);
                    } else {
                        resolve({id, filename, _meta: data});
                    }
                    stream.close();
                }
            );
        });
    }

    /**
     * Deletes the given file from S3
     * @param fileData file field data
     * @param options A config object to be passed with each call to S3.deleteObject.
     *                Options `Bucket` and `Key` will be set by default.
     *                For available options refer to the [AWS S3 deleteObject API](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObject-property).
     */
    delete(file, options = {}) {
        if (!file) throw new Error("Missing required argument 'file'.");
        this.s3.deleteObject({
            Bucket: this.bucket,
            Key: path.join(this.folder, file.filename),
            ...options,
        });
    }

    publicUrl({filename}) {
        // This Url will only work if:
        // - the bucket is public OR
        // - the file is set to a canned ACL (ie, uploadParams: { ACL: 'public-read' }) OR
        // - credentials are passed along with the request
        return urlJoin(`https://${this.bucket}.s3.amazonaws.com`, this.folder, filename);
    }
};
