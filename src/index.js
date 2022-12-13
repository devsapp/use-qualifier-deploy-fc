const { lodash: _, loadComponent, Logger, commandParse } = require('@serverless-devs/core');

module.exports = async (inputs, args) => {
  const logger = new Logger('use-qualifier-deploy-fc');
  if (!_.isPlainObject(inputs)) {
    logger.debug('inputs not is plain object, skip handler');
    return inputs;
  }
  // 如果 qualifier 不存在，则跳过
  const qualifier = _.get(args, 'qualifier');
  if (_.isNil(qualifier)) {
    logger.debug('args.qualifier isNil, skip');
    return inputs;
  }

  // 解析传入的 deploy 参数 --type code / config
  const parsedArgs = commandParse(inputs);
  const rawData = _.get(parsedArgs, 'rawData', []);
  const type = _.get(parsedArgs, 'data.type');

  // 获取插件参数
  const targetDir = _.get(args, 'code-uri', process.cwd());
  logger.debug(`args type: ${type}`);

  // 获取 yaml 的配置
  const region = _.get(inputs, 'props.region');
  const serviceName = _.get(inputs, 'props.service.name');
  if (_.isNil(region) || _.isNil(serviceName)) {
    logger.debug('props.region or props.serviceName is isNil, skip');
    return inputs;
  }
  const functionName = _.get(inputs, 'props.function.name');
  const runtime = _.get(inputs, 'props.function.runtime');
  const isCustomContainer = runtime === 'custom-container';
  const customContainerConfig = _.get(inputs, 'props.function.customContainerConfig');

  const cloneInputs = _.omit(_.cloneDeep(inputs), ['args', 'argsObj', 'props']);
  cloneInputs.args = `--qualifier ${qualifier}`;
  cloneInputs.props = {
    region,
    serviceName,
    functionName,
  }

  // --type code
  if (type === 'code') {
    const codeUri = _.get(inputs, 'props.function.codeUri');
    // 获取指定版本的配置
    const fcInfo = await loadComponent('devsapp/fc-info');
    const remoteConfig = await fcInfo.info(cloneInputs);
    // 处理配置信息
    if (isCustomContainer) {
      _.set(remoteConfig, 'function.customContainerConfig', customContainerConfig);
    } else {
      _.set(remoteConfig, 'function.codeUri', codeUri);
    }
    _.set(inputs, 'props', remoteConfig);
    inputs.args = unsetType(rawData);
    return _.omit(inputs, ['argsObj']);
  } else if (type === 'config') {
    if (isCustomContainer) {
      // 获取指定版本的配置
      const fcInfo = await loadComponent('devsapp/fc-info');
      const remoteConfig = await fcInfo.info(cloneInputs);
      const customContainerConfig = _.get(remoteConfig, 'function.customContainerConfig');
      _.set(inputs, 'props.function.customContainerConfig', customContainerConfig);
      return inputs;
    } else {
      // 获取线上代码
      const fcSync = await loadComponent('devsapp/fc-sync');
      cloneInputs.args += ` --type code --force --target-dir ${targetDir}`;
      const syncRes = await fcSync.sync(cloneInputs);
      const codeDir = _.get(syncRes, `codeFiles.${functionName}`);
      logger.info(`download codeDir: ${codeDir}`);
      // 处理新的代码地址信息
      if (_.isNil(codeDir)) {
        throw new Error(`Can not find ${functionName} code dir.`);
      }
      _.set(inputs, 'props.function.codeUri', codeDir);
      inputs.args = unsetType(rawData);
      return _.omit(inputs, ['argsObj']);
    }
  }
  logger.debug('skip handler')
  return inputs;
}

// 干掉指定的 type，否则不会部署对映的线上配置
function unsetType(rawData) {
  const index = _.indexOf(rawData, '--type')
  if (index !== -1) {
    rawData.splice(0, 2);
  }

  return _.join(rawData, ' ');
}
