import {initBotId} from 'botid/client/core';

initBotId({protect: [{path: '/data/v/*', method: 'GET', advancedOptions: {checkLevel: 'basic'}}]});
