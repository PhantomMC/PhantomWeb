
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
}