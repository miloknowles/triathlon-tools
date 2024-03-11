import { Metadata } from "next";
import React from "react";
import Client from "./client";


export const metadata: Metadata = {
  title: 'Race Results',
  description: "Analyze past race results from Ironman events.",
}


export default function Page() {
  return <Client/>
}