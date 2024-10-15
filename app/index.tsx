import React, { useState } from "react";
import { Text, View, Button, StyleSheet } from "react-native";
import { Audio } from "expo-av";
import axios from "axios";

const OPENAI_API_KEY = "";

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording>();
  const [summary, setSummary] = useState("");

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync();
        setRecording(recording);
      } else {
        console.log("Permission to access microphone is required!");
      }
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync(
        {
          allowsRecordingIOS: false,
        }
      );
      const uri = recording.getURI();
      console.log("Recording stopped and stored at", uri);
      
      if (uri === null) return;

      console.log("Sending the recording to the Whisper API...\n");
      const response = await speechToText(uri);

      if (response === null) return;

      console.log("Summarizing the transcript...\n");
      const summary = await summarizeText(response.text);

      setSummary(summary);

      setRecording(undefined);
    }
  };

  return (
    <View
      style={styles.container}>
      <Button
        title={recording ? "Stop Recording" : "Start Recording"}
        onPress={recording ? stopRecording : startRecording}
      />
      <Text>
        {summary}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: "center",
  },
});

const speechToText = async (uri: string) => {
  const formData = new FormData();
  const file = {
    uri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as any;
  formData.append("file", file);
  formData.append("model", "whisper-1");

  try {
    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });
    console.log("Whisper API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting transcript from Whisper API:", error);
    return null;
  }
};

const summarizeText = async (text: string) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        messages: [{"role": "user", "content": `Summarize the following transcript:\n\n${text}`}],
        model: "gpt-4o-mini",
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );
    console.log("ChatGPT summary response:", response.data.choices[0].message.content);
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error summarizing transcript with ChatGPT:", error);
    return null;
  }
};
