var through2 = require('through2');
var gutil = require('gulp-util');
var path = require('path');
var fs = require('fs');
var Q = require('q');
var diff = require('node-folder-diff');

function incremental_update(options) {

    return through2.obj(function(file, enc, cb) {
        var msg;

        if (!options.version_folder || !options.name || !options.first_version || !options.last_version || !options.dest_folder) {
            msg = 'config option miss.';
            gutil.log('gulp-diff-folder-2zip: ' + msg);
            this.emit('error', new gutil.PluginError('gulp-diff-folder-2zip', msg));
            this.push(file);
            cb();
        }

        var first_version = options.first_version;
        var last_version = options.last_version;
        var tasks = genDiffTask(options.version_folder, first_version, last_version, options.dest_folder, options.name);
        var q_tasks = [];
        try {
            for (var i = 0, len = tasks.length; i < len; i++) {

                q_tasks.push((function(i) {
                    return function() {
                        gutil.log('gulp-diff-folder-2zip: ' + 'first_version ' + first_version + ' - last_version ' + last_version);
                        if (first_version == last_version) {
                            tasks[i][1] = genPath(options.version_folder, parseInt(last_version) + 1, basename);

                            if (!fs.existsSync(path.dirname(tasks[i][1]))) {
                                fs.mkdirSync(path.dirname(tasks[i][1]));
                            }
                            gutil.log('gulp-diff-folder-2zip: ' + 'first_version and last_version same ' + tasks[i][0]);
                        }

                        return diff.diff(tasks[i][0], tasks[i][1]).then(function(archive) {

                            if (!fs.existsSync(path.dirname(tasks[i][2]))) {
                                fs.mkdirSync(path.dirname(tasks[i][2]));
                            }

                            var output = fs.createWriteStream(tasks[i][2]);
                            archive.pipe(output);
                            gutil.log('gulp-diff-folder-2zip: ' + 'success build patch ' + tasks[i][2]);
                            if (i === len - 1) {
                                this.push(file);
                                cb();
                            }
                        });
                    }
                })(i));
            }
            q_tasks.reduce(function(soFar, f) {
                return soFar.then(f);
            }, Q());
        } catch (e) {
            gutil.log('gulp-diff-folder-2zip: ' + e.message);
            this.emit('error', new gutil.PluginError('gulp-diff-folder-2zip', e.message));
            this.push(file);
            cb();
        }
    });
}

function genPath(folder, version, basename) {
    return path.resolve(folder, './' + version + '/' + basename);
}

function genDestPath(folder, basename) {
    return path.resolve(folder, './' + basename);
}

function genDiffTask(folder, first_version, last_version, dest_folder, basename) {
    var tasks = [];
    first_version = parseInt(first_version);
    last_version = parseInt(last_version);
    tasks.push([genPath(folder, first_version, basename), genPath(folder, last_version, basename), genDestPath(dest_folder, basename)]);

    return tasks;
}

function getConfig(config_path, name) {
    var config = null;

    if (fs.existsSync(config_path)) {
        var content = fs.readFileSync(config_path, {
            encoding: 'utf8'
        });
        config = JSON.parse(content);
    } else {
        config = {
            file_name: name,
            first_version: 1,
            last_version: 0
        };
    }
    config.last_version++;
    fs.writeFileSync(config_path, JSON.stringify(config));

    return config;
}

function diff_2zip_update(gulp, config) {

    if (!config.version_folder || !config.name || !config.assets_folder || !config.dest_folder) {
        throw new Error('must provide version_folder, name, assets_folder, dest_folder in config options');
    }

    var config_path = path.resolve(config.version_folder, './config.json');
    gulp.task('diff-2zip-update', function() {
        var config_file = getConfig(config_path, config.name);
        var zip = require('gulp-zip');
        var diff_2zip_update = require('gulp-diff-folder-2zip');
        gulp.src(config.assets_folder + '/**')
            .pipe(zip(config_file.file_name))
            .pipe(gulp.dest(config.version_folder + '/' + config_file.last_version))
            .pipe(incremental_update({
                version_folder: config.version_folder,
                name: config_file.file_name,
                first_version: config_file.first_version,
                last_version: config_file.last_version,
                dest_folder: config.dest_folder
            }));
    });

    return incremental_update;
}


module.exports = diff_2zip_update;
