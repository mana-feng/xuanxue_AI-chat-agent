import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import progress from 'vite-plugin-progress'
// import Components from 'unplugin-vue-components/vite'
// https://vitejs.dev/config/
export default defineConfig({
  dts: true,
  server: {
    port: 3000, // uni-app H5 开发默认端口
  },
  plugins: [
    progress({
      format: 'building [:bar] :percent',
      total: 100,
      width: 100,
      complete: '=',
      incomplete: '',
    }),
    uni(),
    // Components({
    //       dirs: ['src/tm-vuetify/components'],
    // extensions: ['vue'],
    //  resolvers: [
    //     // example of importing Vant
    //     (name) => {
    // 		console.log(name)
    //       // where `name` is always CapitalCase
    //       if (name.startsWith('tm'))
    //         return { importName: name.slice(2), path: './src/tm-vuetify/components' }
    //     },
    //   ],
    //  })
  ],
});
