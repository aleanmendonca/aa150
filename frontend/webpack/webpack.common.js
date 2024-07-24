const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const dotenv = require("dotenv");
const webpack = require("webpack");
const CopyPlugin = require('copy-webpack-plugin');

const cMapsDir = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'cmaps');
const standardFontsDir = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts');
const pdfWorkerPath = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'build', 'pdf.worker.min.mjs');

dotenv.config();

module.exports = {
    entry: path.resolve(__dirname, "..", "./src/index.jsx"),
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".jsx", ".mjs"],
        alias: {
            "react/jsx-dev-runtime.js": "react/jsx-dev-runtime",
            "react/jsx-runtime.js": "react/jsx-runtime",
        },
    },
    module: {
        rules: [
            {
                test: /\.(ts|js)x?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "babel-loader",
                    },
                ],
            },
            {
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false
                },
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader", "postcss-loader"],
            },
            {
                test: /\.(s(a|c)ss)$/,
                use: ["style-loader", "css-loader", "sass-loader"],
            },
            {
                test: /\.(?:ico|gif|png|jpg|jpeg)$/i,
                type: "asset/resource",
            },
            {
                test: /\.(png|jpe?g|gif|xlsx|mp3|ogg|pdf|zip|wav|flac|m4a|aac|mp4|webm|ogv|avi|mov|wmv|mpg|mpeg|3gp|flv|mkv|ts|m3u8|doc|docx|xls|ppt|pptx|txt|csv|xml|rar|7z|tar|gz|bz2|xz|iso|img|apk|exe|msi|deb|rpm|dmg|pkg|app|bat|sh|cmd|ps1|vbs|jar|war|ear|class|java|kt|kts)$/i,
                type: "asset/resource",
            },
            {
                test: /\.(woff(2)?|eot|ttf|otf|svg|)$/,
                type: "asset/inline",
            },
        ],
    },
    output: {
        path: path.resolve(__dirname, "..", "./build"),
        filename: "bundle.[contenthash].js",
        clean: true,
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: "./public/index.html",
                    to: "./build"
                },
                {
                    from: "./public/manifest.json",
                    to: "./manifest.json"
                },
                {
                    from: "./public/favicon.ico",
                    to: "./"
                },
                {
                    from: "./public/favicon.png",
                    to: "./"
                },
                {
                    from: "./public/favicon-16x16.png",
                    to: "./"
                },
                {
                    from: "./public/favicon-32x32.png",
                    to: "./"
                },
                {
                    from: "./public/nopicture.png",
                    to: "./"
                },
                {
                    from: "./public/mstile-150x150.png",
                    to: "./"
                },
                {
                    from: "./public/android-chrome-192x192.png",
                    to: "./"
                },
                {
                    from: "./public/apple-touch-icon.png",
                    to: "./"
                },
                {
                    from: "./public/apple-touch-icon.png",
                    to: "./"
                },
                {
                    from: path.resolve(__dirname, "..", "./public/assets"),
                    to: "./"
                },
                {
                    from: cMapsDir,
                    to: "cmaps/"
                },
                {
                    from: standardFontsDir,
                    to: "standard_fonts/"
                },
                {
                    from: pdfWorkerPath,
                    to: "./pdf.worker.mjs"
                }
            ],
        }),

        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
        new webpack.DefinePlugin({
            'process.env': JSON.stringify(process.env)
        }),
        new HtmlWebpackPlugin({
            alwaysWriteToDisk: true,
            template: path.resolve(__dirname, "..", "./public/index.html"),
            favicon: "./public/favicon.ico",
            manifest: path.resolve(__dirname, "..", "./public/manifest.json"),
            filename: "index.html"
        }),
    ],
    stats: "errors-only",
};
