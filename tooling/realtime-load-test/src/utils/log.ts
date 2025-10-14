import chalk from 'chalk';

export function logInfo(message: string): void {
  console.log(chalk.cyan('[info]'), message);
}

export function logSuccess(message: string): void {
  console.log(chalk.green('[ok]'), message);
}

export function logWarn(message: string): void {
  console.warn(chalk.yellow('[warn]'), message);
}

export function logError(message: string): void {
  console.error(chalk.red('[error]'), message);
}

export function logVerbose(enabled: boolean, message: string): void {
  if (enabled) {
    console.debug(chalk.gray('[debug]'), message);
  }
}
