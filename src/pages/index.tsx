import React from 'react';
import importHTML, { importEntry, execScripts } from '../../lib/html-loader';
import styles from './index.less';

importHTML('http://localhost:8082').then(res => {
  // console.log(res.template);
  // console.log(res.getExternalScripts());
  // res.getExternalScripts().then(res => console.log(res))
  // const { execScripts } = res;
  // execScripts(window)
  // console.log(execScripts(window))
});
// console.log(execScripts(null, ['http://localhost:8082/umi.js'], window))

export default () => {
  // execScripts('http://localhost:8082/umi.js', ['http://localhost:8082/umi.js'])
  //   .then(res => console.log(res))
  // importHTML('http://localhost:8082').then(res => console.log(res));
  // importEntry({
  //   scripts: ['http://localhost:8082/umi.js'],
  //   styles: ['http://localhost:8082/umi.css']
  // }).then(res => {
  //   console.log(res);
  // })
  return (
    <div>
      <h1 className={styles.title}>Page index</h1>
    </div>
  );
};
