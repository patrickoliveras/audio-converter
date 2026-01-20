export const Ipc = {
  SelectInputFile: 'audioConverter:selectInputFile',
  SelectOutputFolder: 'audioConverter:selectOutputFolder',
  SelectOutputFile: 'audioConverter:selectOutputFile',
  SuggestOutputPath: 'audioConverter:suggestOutputPath',
  PathExists: 'audioConverter:pathExists',
  StartConversion: 'audioConverter:startConversion',
  CancelConversion: 'audioConverter:cancelConversion',
  RevealItemInFolder: 'audioConverter:revealItemInFolder',
  RevealLogs: 'audioConverter:revealLogs',

  // Settings
  GetSettings: 'audioConverter:getSettings',
  UpdateSettings: 'audioConverter:updateSettings',

  // i18n
  GetI18n: 'audioConverter:getI18n',

  EventProgress: 'audioConverter:event:progress',
  EventDone: 'audioConverter:event:done',
  EventError: 'audioConverter:event:error'
} as const;

