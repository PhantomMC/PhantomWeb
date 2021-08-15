
/**
 * Class that is able to recieve files, descern if they are pictures,
 * and convert them into a string. Should also be able to change the 
 * quality of the picture
 * @param {any} options
 */
var ImageReader = function (options) {

    function ImageReader(opts) {
        var defaultOptions = {
            output: 'png',
            greyscale: false,
            quality: 70,
            square: true,
            threshold: 500,
            responsive: false,
        };

        //extend default options with passed options
        var options = (opts && _.isObject(opts)) ? _.pick(opts, _.keys(defaultOptions)) : {};
        options = _.extend(defaultOptions, options);

        //check the options for correct values and use fallback value where necessary
        this.options = _.forIn(options, function (value, key, object) {

            switch (key) {
                case 'square':
                case 'greyscale':
                case 'responsive':
                    object[key] = _.isBoolean(value) ? value : defaultOptions[key];
                    break;
                case 'output':
                    value = String(value).toLowerCase();
                    object[key] = _.includes(allowedOutputFormats, value) ? value : defaultOptions[key];
                    break;
                case 'quality':
                    value = _.isFinite(value) ? value : Number(value);
                    object[key] = (value && value >= 0 && value <= 100) ? value : defaultOptions[key];
                    break;
                case 'threshold':
                    value = _.isFinite(value) ? value : Number(value);
                    object[key] = (value && value >= 0) ? value : defaultOptions[key];
                    break;
            }
        });
    }


    //this processes the Jimp image buffer
    AvatarStorage.prototype._processImage = function (image, baseFilename, cb) {


        //create a reference for this to use in local functions
        var that = this;

        var batch = [];

        //the responsive sizes
        var sizes = ['lg', 'md', 'sm'];
        var filename = this._generateRandomFilename();
        if (baseFilename) {
            filename = this._generateFilename(baseFilename);
        }

        var mime = Jimp.MIME_PNG;

        //create a clone of the Jimp image
        var clone = image.clone();

        //fetch the Jimp image dimensions
        var width = clone.bitmap.width;
        var height = clone.bitmap.height;
        var square = Math.min(width, height);
        var rectangle = Math.max(width, height);
        var threshold = this.options.threshold;

        //resolve the Jimp output mime type
        switch (this.options.output) {
            case 'jpg':
                mime = Jimp.MIME_JPEG;
                break;
            case 'png':
            default:
                mime = Jimp.MIME_PNG;
                break;
        }

        //auto scale the image dimensions to fit the threshold requirement
        if (threshold && square > threshold) {
            clone = (square == width) ? clone.resize(threshold, Jimp.AUTO) : clone.resize(Jimp.AUTO, threshold);
        } else {
            clone = (square == width) ? clone.resize(threshold, Jimp.AUTO) : clone.resize(Jimp.AUTO, threshold);
        }

        console.log("threshold=" + threshold + ", square=" + square + ", rectangle=" + rectangle);

        //crop the image to a square if enabled
        if (this.options.square) {

            if (threshold) {
                square = Math.min(square, threshold);
            }

            //fetch the new image dimensions and crop
            clone = clone.crop((clone.bitmap.width - square) / 2, (clone.bitmap.height - square) / 2, square, square);
        }

        //convert the image to greyscale if enabled
        if (this.options.greyscale) {
            clone = clone.greyscale();
        }

        //set the image output quality
        clone = clone.quality(this.options.quality);

        if (this.options.responsive) {

            //map through the responsive sizes and push them to the batch
            batch = _.map(sizes, function (size) {

                var outputStream;

                var image = null;
                var filepath = filename.split('.');

                //create the complete filepath and create a writable stream for it
                filepath = filepath[0] + "_" + size + '.' + filepath[1];
                console.log("filepath=" + filepath)
                filepath = path.join(that.uploadPath, filepath);
                outputStream = that._createOutputStream(filepath, cb);

                //scale the image based on the size
                switch (size) {
                    case 'sm':
                        image = clone.clone().scale(0.3);
                        break;
                    case 'md':
                        image = clone.clone().scale(0.7);
                        break;
                    case 'lg':
                        image = clone.clone();
                        break;
                }

                //return an object of the stream and the Jimp image
                return {
                    stream: outputStream,
                    image: image
                };
            });
        }
        else {
            //push an object of the writable stream and Jimp image to the batch
            batch.push({
                stream: that._createOutputStream(path.join(that.uploadPath, filename), cb),
                image: clone
            });
        }

        //process the batch sequence
        _.each(batch, function (current) {
            //get the buffer of the Jimp image using the output mime type
            current.image.getBuffer(mime, function (err, buffer) {

                if (that.options.storage == 'local') {
                    //create a read stream from the buffer and pipe it to the output stream
                    streamifier.createReadStream(buffer).pipe(current.stream);
                }
            });
        });
    }
}