import $ from 'jquery';

import styles from './index.css';

console.log('Hello OntoNet!');

$('<div>Hello OntoNet!</div>')
  .appendTo(document.documentElement)
  .addClass(styles.text);
