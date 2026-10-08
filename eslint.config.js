export default [
    {
        ignores: ["dist/**", "node_modules/**", "public/mediapipe/**"],
    },
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                console: "readonly",
                document: "readonly",
                window: "readonly",
                navigator: "readonly",
                performance: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                getComputedStyle: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                URL: "readonly",
                self: "readonly",
                caches: "readonly",
                fetch: "readonly",
                Response: "readonly",
                Promise: "readonly",
                Buffer: "readonly",
            },
        },
        rules: {
            "no-unused-vars": ["error", { varsIgnorePattern: "^React$" }],
            "no-undef": "error",
            "no-console": "warn",
            "semi": ["error", "always"],
            "quotes": ["error", "double"],
        },
    },
];
