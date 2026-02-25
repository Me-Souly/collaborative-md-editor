const path = require('path');
const rspack = require('@rspack/core');
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');

const paths = require('./tsconfig.json').compilerOptions.paths;
const baseUrl = require('./tsconfig.json').compilerOptions.baseUrl || 'src';

// Получаем переменные окружения, начинающиеся с REACT_APP_
const REACT_APP = /^REACT_APP_/i;

// Собираем все REACT_APP_ переменные в объект
const reactAppEnv = Object.keys(process.env)
  .filter((key) => REACT_APP.test(key))
  .reduce((env, key) => {
    env[key] = process.env[key];
    return env;
  }, {});

// Определяем process.env для клиентского кода
const processEnv = {
  'process.env': JSON.stringify({
    NODE_ENV: process.env.NODE_ENV || 'development',
    ...reactAppEnv,
  }),
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
};

// Добавляем каждую переменную REACT_APP_ отдельно для прямого доступа
Object.keys(reactAppEnv).forEach((key) => {
  processEnv[`process.env.${key}`] = JSON.stringify(reactAppEnv[key]);
});

// Преобразуем paths из tsconfig в формат для Rspack
const rspackAliases = {};

Object.keys(paths).forEach((key) => {
  const aliasPaths = paths[key].map((p) => {
    const cleanPath = p.replace('/*', '');
    return path.resolve(__dirname, baseUrl, cleanPath);
  });
  
  if (key.endsWith('/*')) {
    const aliasKey = key.replace('/*', '');
    rspackAliases[aliasKey] = aliasPaths[0];
  } else {
    rspackAliases[key] = aliasPaths[0];
  }
});

const isDev = process.env.NODE_ENV === 'development';

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: './src/index.tsx',
  context: __dirname,
  experiments: {
    css: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: rspackAliases,
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: isDev ? 'static/js/[name].js' : 'static/js/[name].[contenthash:8].js',
    chunkFilename: isDev ? 'static/js/[name].chunk.js' : 'static/js/[name].[contenthash:8].chunk.js',
    assetModuleFilename: 'static/media/[name].[hash][ext]',
    clean: true,
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts|jsx|js)$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                  decorators: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    development: isDev,
                    refresh: isDev,
                  },
                },
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.module\.css$/i,
        use: [
          {
            loader: 'builtin:lightningcss-loader',
            options: {
              targets: 'defaults',
              cssModules: {
                pattern: '[name]__[local]--[hash:base64:5]',
              },
            },
          },
        ],
        type: 'css/module',
      },
      {
        test: /\.css$/i,
        exclude: /\.module\.css$/i,
        type: 'css',
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    ...(isDev ? [new ReactRefreshPlugin()] : []),
    new rspack.HtmlRspackPlugin({
      template: './public/index.html',
    }),
    new rspack.DefinePlugin({
      ...processEnv,
    }),
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: 'public/manifest.json', to: 'manifest.json' },
        { from: 'public/icon.svg', to: 'icon.svg' },
        { from: 'public/favicon.ico', to: 'favicon.ico' },
        { from: 'public/logo192.png', to: 'logo192.png' },
        { from: 'public/logo512.png', to: 'logo512.png' },
        { from: 'public/robots.txt', to: 'robots.txt' },
        { from: 'public/service-worker.js', to: 'service-worker.js' },
      ],
    }),
  ],
  devServer: {
    port: 3000,
    host: '0.0.0.0', // Позволяет подключаться из локальной сети
    hot: true,
    historyApiFallback: true,
    open: true,
    // Ошибка URI malformed не критична - это предупреждение от serve-index
    // которое не влияет на работу приложения. Можно игнорировать.
  },
  devtool: isDev ? 'eval-source-map' : 'source-map',
  optimization: {
    minimize: !isDev,
  },
};

