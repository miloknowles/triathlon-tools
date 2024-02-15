"use client";
 
import * as React from "react";

import { SearchSelect, SearchSelectItem } from "@tremor/react";

import { COURSES } from "./courses";
 

export default function ChooseCourse(props: { value: any, setValue: (value: string) => void }) { 
  const options = COURSES.map(v => (
    <SearchSelectItem value={v.value} key={v.value}>
      {v.label} {v.emoji}
    </SearchSelectItem>
  ));

  return (
    <div className="">
      <SearchSelect value={props.value} onValueChange={props.setValue} placeholder="Choose a course">
        {options}
      </SearchSelect>
    </div>
  )
}

