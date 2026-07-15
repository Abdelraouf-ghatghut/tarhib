// ponytail: les packages React Native n'ont pas encore de config ESLint propre ;
// on les ignore ici pour que le hook lint-staged (eslint --fix global) ne lint que
// les workspaces qui ont leur config (apps/backend, apps/web-admin). Retirer chaque
// entrée quand le package concerné reçoit son propre eslint.config.
export default [
  {
    ignores: [
      'apps/mobile-employee/**',
      'apps/mobile-operations/**',
      'packages/mobile-shared/**',
    ],
  },
];
