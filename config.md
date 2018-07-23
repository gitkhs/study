## package.json

```
 {
 "scripts": {
    "build": "webpack --config webpack.config-classic.js && webpack --config webpack.config-modern.js",
    "start-back": "webpack-dev-server --https --port 8080 --watch-content-base --open",
    "start": "webpack-dev-server --watch-content-base --open",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "babel-core": "^6.26.3",
    "babel-loader": "^7.1.5",
    "babel-polyfill": "^6.26.0",
    "babel-preset-env": "^1.7.0",
    "css-loader": "^1.0.0",
    "node-sass": "^4.9.2",
    "sass-loader": "^7.0.3",
    "style-loader": "^0.21.0",
    "webpack": "^4.16.0",
    "webpack-cli": "^3.0.8",
    "webpack-dev-server": "^3.1.4",
    "whatwg-fetch": "^2.0.4"
  }
}
```

## webpack-dev

```javascript
module.exports = {
	mode: 'development',
	entry: {
		'rx-app': './src/app.js',
	},
	output: {
		path: __dirname + '/asset',
		filename: '[name].js',
	},
	devServer: {
		contentBase: './dist'
	},
	module: {
		rules: [{
			test: /\.scss$|\.sass$|\.css$/,
			use: [{
				loader: 'style-loader',
				options: {
					insertAt: 'top',
				},
			}, {
				loader: 'css-loader',
			}, {
				loader: 'sass-loader',
			}],
		}],
	},
};
```

## webpack-build

```javascript
module.exports = {
	entry: {
		'ko-app-mdrn': './src/ko-app.js',
		'v-app-mdrn': './src/v-app.js',
		'ng-app-mdrn': './src/ng-app.js',
	},
	output: {
		path: __dirname + '/asset',
		filename: '[name].js',
	},
	module: {
		rules: [
		],
	},
};
```

```javascript
module.exports = {
	entry: {
		app: './src/app.js',
		'ko-app-clss': [
			'babel-polyfill',
			'whatwg-fetch',
			'./src/ko-app.js',
		],
	},
	output: {
		path: __dirname + '/asset',
		filename: '[name].js',
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				use: [
					{
						loader: 'babel-loader',
						query: {
							presets: ['env']
						},
					},
				],
			},
			{
				test: /\.scss$|\.sass$|\.css$/,
				use: [
					{
						loader: 'style-loader',
						options: {
							insertAt: 'top',
						},
					},
					{
						loader: 'css-loader',
					},
					{
						loader: 'sass-loader',
					},
				],
			},
		],
	},
};
```
