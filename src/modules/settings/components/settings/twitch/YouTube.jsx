import React, {useEffect} from 'react';
import Panel from 'rsuite/Panel';
import Toggle from 'rsuite/Toggle';
import {CategoryTypes} from '../../../../../constants.js';
import formatMessage from '../../../../../i18n/index.js';
import extension from '../../../../../utils/extension.js';
import styles from '../../../styles/header.module.css';
import {registerComponent} from '../../Store.jsx';

const EXTENSION_ID = extension.getExtensionId();
const SETTING_NAME = formatMessage({defaultMessage: 'YouTube (beta)'});
const browser = window.chrome || window.browser;

function sendExtensionCommand(commandData, callback = undefined) {
  if (browser?.runtime?.sendMessage != null) {
    browser.runtime.sendMessage(EXTENSION_ID, commandData, callback);
    return;
  }

  if (callback != null) {
    const handleMessageEvent = (event) => {
      if (event.origin !== window.origin) {
        return;
      }

      try {
        const parsedData = JSON.parse(event.data);
        if (parsedData.extensionId !== EXTENSION_ID || parsedData.type !== 'BETTERTTV_EXTENSION_COMMAND_RESPONSE') {
          return;
        }

        window.removeEventListener('message', handleMessageEvent);

        callback(parsedData.data);
      } catch (_) {}
    };
    window.addEventListener('message', handleMessageEvent, false);
  }

  window.postMessage(
    JSON.stringify({
      extensionId: EXTENSION_ID,
      type: 'BETTERTTV_EXTENSION_COMMAND',
      data: commandData,
    }),
    window.origin
  );
}

function checkYouTubePermission() {
  return new Promise((resolve) => {
    sendExtensionCommand({type: 'CHECK_YOUTUBE_PERMISSION'}, (granted) => resolve(granted));
  });
}

function requestYouTubePermission() {
  sendExtensionCommand({type: 'REQUEST_YOUTUBE_PERMISSION'});
}

function YouTube() {
  const [loading, setLoading] = React.useState(true);
  const [value, setValue] = React.useState(false);

  useEffect(() => {
    checkYouTubePermission()
      .then((granted) => {
        setValue(granted);
        setLoading(false);
      })
      .catch(() => {});
  }, []);

  function requestPermission() {
    setLoading(true);
    requestYouTubePermission();

    let timeout;
    const interval = setInterval(async () => {
      const granted = await checkYouTubePermission();
      if (!granted) {
        return;
      }
      clearInterval(interval);
      clearTimeout(timeout);
      setValue(granted);
      setLoading(false);
    }, 500);
    timeout = setTimeout(() => {
      clearInterval(interval);
      setLoading(false);
    }, 30000);
  }

  return (
    <Panel header={SETTING_NAME}>
      <div className={styles.settingRow}>
        <p className={styles.settingDescription}>
          {formatMessage({defaultMessage: 'Show BetterTTV emotes on YouTube Live Chat'})}
        </p>
        <Toggle disabled={loading || value} checked={value} onChange={() => requestPermission()} />
      </div>
    </Panel>
  );
}

function maybeRegisterComponent() {
  if (!EXTENSION_ID) {
    return null;
  }

  return registerComponent(YouTube, {
    settingId: 'youtube',
    name: SETTING_NAME,
    category: CategoryTypes.CHAT,
    keywords: ['youtube'],
  });
}

export default maybeRegisterComponent();
