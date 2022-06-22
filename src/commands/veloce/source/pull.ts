/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {gunzipSync} from 'zlib';
import * as os from 'os';
import { flags, SfdxCommand } from '@salesforce/command';
import {Messages, SfdxError} from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import {pullPml} from "../../../common/pull.pml";
import {pullUI} from "../../../common/pull.ui";
import {pullPM} from "../../../common/pull.pm";

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('veloce-sfdx-v3', 'source-pull');

export default class Pull extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static examples = messages.getMessage('examples').split(os.EOL);

  public static args = [];

  // -u quick-guide
  // -m model:Octa
  // -p ./source/templates
  protected static flagsConfig = {
    // flag with a value (-m, --members=VALUE)
    members: flags.string({
      char: 'm',
      description: messages.getMessage('membersFlagDescription'),
    }),
    sourcepath: flags.string({
      char: 'p',
      description: messages.getMessage('sourcepathFlagDescription'),
    }),
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = true;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = true;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {
    const conn = this.org.getConnection();
    const members = (this.flags.members || '') as string;
    const sourcepath = ((this.flags.sourcepath || 'source') as string).replace(/\/$/, ''); // trim last slash if present

    const pmlsToDump = new Set<string>()
    const uisToDump = new Set<string>()
    const pmsToDump = new Set<string>()

    const membersArray = members.split(',')
    for(const m of membersArray) {
      const parts = m.split(':')
      switch (parts[0]) {
        case 'pml':
          pmlsToDump.add(parts[1])
          break
        case 'config-ui':
          uisToDump.add(parts[1] + ':' + (parts[2] ?? ''))
          break
      }
    }
    // each dumped pml record adds pm record to set of to be dumped
    const pmlRecords = await pullPml.bind(this)(sourcepath, conn, members === '', pmlsToDump, pmsToDump)
    const uiRecords = await pullUI.bind(this)(sourcepath, conn, members === '', uisToDump, pmsToDump)
    const pmRecords = await pullPM.bind(this)(sourcepath, conn, members === '', pmsToDump)

    // Return an object to be displayed with --json
    return { 'pml': pmlRecords, 'config-ui': uiRecords, 'pm': pmRecords }
  }
}
