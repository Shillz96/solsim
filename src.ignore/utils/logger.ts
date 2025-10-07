import chalk from 'chalk';

const logger = {
  info: (message: string) => console.log(chalk.cyan(`ℹ ${message}`)),
  success: (message: string) => console.log(chalk.green(`✓ ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`⚠ ${message}`)),
  error: (message: string) => console.log(chalk.red(`✗ ${message}`)),
  debug: (message: string) => console.log(chalk.gray(`🔍 ${message}`)),
  step: (stepNumber: number, message: string) => console.log(chalk.bold.blue(`\n[STEP ${stepNumber}] ${message}`)),
  transaction: (message: string) => console.log(chalk.magenta(`💰 ${message}`)),
  price: (message: string) => console.log(chalk.yellow(`💵 ${message}`)),
  separator: () => console.log(chalk.gray('─'.repeat(70))),
  line: (color: 'cyan' | 'green' | 'red' | 'magenta' | 'gray' = 'cyan') => console.log(chalk[color]('━'.repeat(70))),
  timestamp: () => new Date().toLocaleTimeString(),
};

export default logger;
