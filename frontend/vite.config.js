// vite.config.js
import react from '@vitejs/plugin-react';
import {resolve} from 'path';
import {defineConfig, transformWithEsbuild} from 'vite'
import dotenv from 'dotenv';
import json from "@rollup/plugin-json";

dotenv.config(); // Load environment variables from .env file

export default defineConfig({
    plugins: [
        json(),
        react(),
    ],
    resolve: {
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'], // Adicione a extensão .json
    },

    assetsInclude: ['**/*.xlsx', '**/*.mp3', '**/*.wav', '**/*.ogg', '**/*.flac', '**/*.m4a', '**/*.aac', '**/*.mp4', '**/*.webm', '**/*.ogv', '**/*.avi', '**/*.mov', '**/*.wmv', '**/*.mpg', '**/*.mpeg', '**/*.3gp', '**/*.flv', '**/*.mkv', '**/*.ts', '**/*.m3u8', '**/*.pdf', '**/*.doc', '**/*.docx', '**/*.xls', '**/*.xlsx', '**/*.ppt', '**/*.pptx', '**/*.txt', '**/*.csv', '**/*.xml', '**/*.zip', '**/*.rar', '**/*.7z', '**/*.tar', '**/*.gz', '**/*.bz2', '**/*.xz', '**/*.iso', '**/*.img', '**/*.apk', '**/*.exe', '**/*.msi', '**/*.deb', '**/*.rpm', '**/*.dmg', '**/*.pkg', '**/*.app', '**/*.bat', '**/*.sh', '**/*.cmd', '**/*.ps1', '**/*.vbs', '**/*.jar', '**/*.war', '**/*.ear', '**/*.class', '**/*.java', '**/*.kt', '**/*.kts'],
    define: {
        'process.env': process.env
    },


})
