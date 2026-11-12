import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
];
