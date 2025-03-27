export default {
  build: {
    lib: {
      entry: 'src/speedtest-entry.ts',  // File containing @cloudflare/speedtest import to build from
      name: 'CloudflareSpeedTest',
      formats: ['umd'],                 // Need a umd format to run @cloudflare/speedtest inside <script> tag

      fileName: (format) => `cloudflare-speedtest.${format}.js`,
    },

    minify: false,
  },
};

