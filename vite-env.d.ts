/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_KEY: string;
    // 如果有其他环境变量，在这里添加
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
