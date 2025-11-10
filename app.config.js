import 'dotenv/config';

export default {
  expo: {
    name: "PrintEase",
    slug: "PrintEase",
    version: "1.0.0",
    android: {
      package: "com.yashwanth535.PrintEase",
    },
    extra: {
      API_URL: process.env.API_URL,
    },
  },
};
