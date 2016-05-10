# gulp-diff-floder-2zip

A gulp plugin for assets incremental update

## Install 

```shell
npm install gulp-diff-floder-2zip --save-dev
```

## Usage

```javascript
require('gulp-diff-floder-2zip')(gulp, {
    version_folder : version_folder,//资源发布目录
    name : 'article_detail.zip',//zip包名
    assets_folder : assets, //本地资源目录,
    dest_folder: dest_folder //目标生成目录
});

gulp.task('publish', ['diff-2zip-update'] , function(){});
```