import React, { useState } from "react";
import { Text, View, Button } from "react-native";
import { Audio } from "expo-av";
import axios from "axios";


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
          Authorization: `Bearer YOUR_API_KEY`,
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


const speechToText = async (uri: string) => {
  const formData = new FormData();
  const file = {
    uri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as any;
  formData.append("file", file);
  formData.append('model', 'whisper-1');

  try {
    const response = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer YOUR_API_KEY`,
      },
    });
    console.log("Whisper API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting transcript from Whisper API:", error);
    return null;
  }
};

export default function Index() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
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
        setIsRecording(true);
      } else {
        console.log("Permission to access microphone is required!");
      }
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log("Recording stopped and stored at", uri);
      
      if (uri === null) return;

      console.log("Sending the recording to the Whisper API...\n");
      const response = await speechToText(uri);

      if (response === null) return;

      console.log("Summarizing the transcript...\n");
      const summary = await summarizeText(response.text);

      setSummary(summary);

      setRecording(null);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}>
      <Button
        title={isRecording ? "Stop Recording" : "Start Recording"}
        onPress={isRecording ? stopRecording : startRecording}
      />
      <Text>
        {summary}
      </Text>
    </View>
  );
}
