import React, { useEffect, useState } from "react";
import LoadingButton from "@mui/lab/LoadingButton";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import axios from 'axios';

const PlayPause = (props) => {
  const [loading, setLoading] = useState(false);
  const [applicationRunning, setApplicationRunning] = useState(true);
  const [applicationPaused, setApplicationPaused] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [editorChanged, setEditorChanged] = useState(false);

  const commsManager = window.RoboticsExerciseComponents.commsManager;
  const config = JSON.parse(
    document.getElementById("exercise-config").textContent
  );

  useEffect(() => {
    const callback = (message) => {
      const state = message.data.state;
      setApplicationPaused(state === "paused");
      setApplicationRunning(state === "application_running");
      setDisabled(
        !(
          state === "visualization_ready" ||
          state === "application_running" ||
          state === "paused"
        )
      );
    };

    commsManager.subscribe([commsManager.events.STATE_CHANGED], callback);

    return () => {
      commsManager.unsubscribe([commsManager.events.STATE_CHANGED], callback);
    };
  }, []);

  React.useEffect(() => {
    RoboticsReactComponents.CodeEditor.OnEditorCodeChanged(() => {
      setEditorChanged(true);
    });
  }, []);

  const play = () => {
    setLoading(true);
    let editorCode = "";
    editorCode = RoboticsReactComponents.CodeEditor.getCode();

    if (!editorChanged && applicationPaused) {
      commsManager.resume();
    } else {
      runCode(editorCode);
    }
    setLoading(false);
    setEditorChanged(false);
  };

  const runCode = (code) => {
    setLoading(true);
    const errorMessage =
      "Syntax or dependency error, check details on the console.\n";
    
    const serverBase = `${document.location.protocol}//${document.location.hostname}:7164`;
    let requestUrl = `${serverBase}/exercises/exercise/${config[0].exercise_id}/user_code_zip`;

    axios.post(requestUrl, {
      exercise_id: config[0].exercise_id
    })
      .then((response) => {console.log(response);response.json()})
      .then((data) => {    
        console.log(data)
      })
      .catch((error) => {
          console.log("Error fetching circuit options:", error);
      });

    window.RoboticsExerciseComponents.commsManager
      .terminate_application()
      .then(() => {
        // TODO: zip also common and exercise

        window.RoboticsExerciseComponents.commsManager
          .run({
            code: code,
            template: config[0].template,
            exercise_id: config[0].exercise_id,
          })
          .then(() => {})
          .catch((response) => {
            let linterMessage = JSON.stringify(response.data.message).split(
              "\\n"
            );
            RoboticsReactComponents.MessageSystem.Alert.showAlert(
              errorMessage,
              "error"
            );
            console.log(`Received linter message ·${linterMessage}`);
          });
      });
  };

  const pause = () => {
    setLoading(true);
    window.RoboticsExerciseComponents.commsManager
      .pause()
      .then(() => {})
      .catch((response) => console.log(response))
      .finally(() => setLoading(false));
  };

  return (
    <LoadingButton
      disabled={disabled}
      id={"loadIntoRobot"}
      loading={loading}
      color={"secondary"}
      onClick={applicationRunning ? pause : play}
      sx={{ m: 0.5 }}
      variant={"outlined"}
    >
      {applicationRunning ? <PauseIcon /> : <PlayArrowIcon />}
    </LoadingButton>
  );
};

export default PlayPause;
