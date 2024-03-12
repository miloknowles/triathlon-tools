import { extendTailwindMerge } from "tailwind-merge";

export const isValueInArray = (value: any, array: any[]): boolean => {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === value) {
      return true;
    }
  }
  return false;
};


export function makeClassName(componentName: string) {
  return (className: string) => {
    return `tremor-${componentName}-${className}`;
  };
}


export const tremorTwMerge = extendTailwindMerge({
  classGroups: {
    boxShadow: [
      {
        shadow: [
          {
            tremor: ["input", "card", "dropdown"],
            "dark-tremor": ["input", "card", "dropdown"],
          },
        ],
      },
    ],
    borderRadius: [
      {
        rounded: [
          {
            tremor: ["small", "default", "full"],
            "dark-tremor": ["small", "default", "full"],
          },
        ],
      },
    ],
    fontSize: [
      {
        text: [
          {
            tremor: ["default", "title", "metric"],
            "dark-tremor": ["default", "title", "metric"],
          },
        ],
      },
    ],
  },
});