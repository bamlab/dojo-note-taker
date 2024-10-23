import React, { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';

import { Audio } from "expo-av";
import axios from "axios";

const OPENAI_API_KEY = "";

export default function HomeScreen() {
  const [recording, setRecording] = useState<Audio.Recording>();
  const [summary, setSummary] = useState();

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
      setSummary(undefined);
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

      <View style={{
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        padding: 20,
      }}>
        <View
          style={{
            backgroundColor: "#E8E8E8",
            borderRadius: 12,
            marginBottom: 20,
            padding: 20,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#283833", fontSize: 16, }}>
            {summary ? summary : "Start the recording to take a note. The summary of the note will appear after you stop the recording."}
          </Text>
        </View>
        <TouchableOpacity
          onPress={recording ? stopRecording : startRecording}
          style={{
            width: "100%",
            flexDirection: "row",
            height: 64,
            borderRadius: 12,
            backgroundColor: "#205735",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 5, // For Android shadow
          }}
        >

          {recording && !summary && (
            <View style={{ marginRight: 8 }}>
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
          )}
          {(!recording || summary) && <MaterialIcons name={recording ? "stop" : "mic"} size={24} color="white" />}
          {(!recording || summary) && <Text style={{ color: "white", fontSize: 20, marginLeft: 8 }}>
            {recording ? "Stop and summarize" : "New Recording"}
          </Text>}
        </TouchableOpacity>

      </View>




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
        messages: [{ "role": "user", "content": `Summarize the following transcript:\n\n${text}` }],
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

// 7bb665
