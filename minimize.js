'use strict';

Error.stackTraceLimit = Infinity;

var FS = require('fs'),
    PATH = require('path'),
    fs = require('fs'),
    SVGO = require('svgo'),
    svgo = new SVGO(/*{ custom config object }*/);


function optimizeFolder(dir, output) {
    // absoluted folder path
    var path = PATH.resolve(dir);

    // list folder content
    FS.readdir(path, function(err, files) {
        files = files.filter(file => /.*\.svg$/.test(file))

        if (err) {
            console.error(err);
            return;
        }

        if (!files.length) {
            console.log('Directory \'' + dir + '\' is empty.');
            return;
        }

        var i = 0,
            found = false;

        function optimizeFileSync(file) {

            // absoluted file path
            var filepath = PATH.resolve(path, file);
            var outfilepath = output ? PATH.resolve(output, file) : filepath;


            // check if file name matches *.svg
            if (/.*\.svg$/.test(filepath)) {
                console.log(i, 'Processing file:', filepath)

                found = true;
                FS.readFile(filepath, 'utf8', function(err, data) {

                    if (err) {
                        console.error(err);

                        onError(filepath)
                        if (++i < files.length) {
                            optimizeFile(files[i]);
                        }
                        return;
                    }

                    var startTime = Date.now(),
                        time,
                        inBytes = Buffer.byteLength(data, 'utf8'),
                        outBytes;

                    try {
                        if (inBytes > 100000) {
                            console.error('WOOOOOOOOOOOOOOOOW. HUGE SVG')
                            throw "Too big file: " + inBytes
                        }
                        svgo.optimize(data, function(result) {
                            if (result.error) {
                                console.error(result.error);
                                onError(filepath)
                                if (++i < files.length) {
                                    optimizeFile(files[i]);
                                }
                                return;
                            }

                            outBytes = Buffer.byteLength(result.data, 'utf8');
                            time = Date.now() - startTime;

                            writeOutput();

                            function writeOutput() {
                                FS.writeFile(outfilepath, result.data, 'utf8', report);
                            }

                            function report(err) {
                                if (err) {
                                    if (err.code === 'ENOENT') {
                                        mkdirp(output, writeOutput);
                                        return;
                                    } else if (err.code === 'ENOTDIR') {
                                        console.error('Error: output \'' + output + '\' is not a directory.');
                                        return;
                                    }
                                    console.error(err);
                                }

                                console.log(i, 'time', time, 'inBytes, outBytes', inBytes, outBytes);

                                //move on to the next file
                                if (++i < files.length) {
                                    optimizeFile(files[i]);
                                }

                            }

                        });
                    } catch (e) {
                        console.error(e)
                        onError(filepath)

                        if (++i < files.length) {
                            optimizeFile(files[i]);
                        }
                    }
                });

            }
            //move on to the next file
            else if (++i < files.length) {
                optimizeFile(files[i]);
            } else if (!found) {
                console.log('No SVG files have been found.');
            }


        }

        function optimizeFile(filepath) {
            setTimeout(function() {
                optimizeFileSync(filepath)
            })
        }

        optimizeFile(files[i]);

    });

}

optimizeFolder("./svg-min")

function onError(filepath) {
    console.log('FUUUUCK:', filepath)
    try {
        fs.unlinkSync(filepath)
        fs.unlinkSync(filepath + '.txt')
    } catch (e) {
        console.log(e)
    }
}
