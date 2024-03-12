export interface IronmanData {
  ResultId: string;
  Contact: {
    FullName: string;
  };
  AgeGroup: string;
  CountryISO2: string;
  EventStatus: string;
  FinishTime: number;
  SwimTime: number;
  BikeTime: number;
  RunTime: number;
  Transition1Time: number;
  Transition2Time: number;
  FinishTimeConverted: string;
  SwimTimeConverted: string;
  BikeTimeConverted: string;
  RunTimeConverted: string;
  Transition1TimeConverted: string;
  Transition2TimeConverted: string;

  FinishRankGroup: number;
  FinishRankGender: number;
  FinishRankOverall: number;
  SwimRankGroup: number;
  SwimRankGender: number;
  SwimRankOverall: number;
  BikeRankGroup: number;
  BikeRankGender: number;
  BikeRankOverall: number;
  RunRankGroup: number;
  RunRankGender: number;
  RunRankOverall: number;
}


export const AGE_GROUPS = [
  { value: "overall", label: "Overall" },
  { value: "m-overall", label: "Overall (M)" },
  { value: "f-overall", label: "Overall (F)" },
  { value: "MPRO", label: "Pro (M)" },
  { value: "FPRO", label: "Pro (F)" },

  // Female
  { value: "F18-24", label: "Female 18-24" },
  { value: "F25-29", label: "Female 25-29" },
  { value: "F30-34", label: "Female 30-34" },
  { value: "F35-39", label: "Female 35-39" },
  { value: "F40-44", label: "Female 40-44" },
  { value: "F45-49", label: "Female 45-49" },
  { value: "F50-54", label: "Female 50-54" },
  { value: "F55-59", label: "Female 55-59" },
  { value: "F60-64", label: "Female 60-64" },
  { value: "F65-69", label: "Female 65-69" },
  { value: "F70-74", label: "Female 70-74" },

  // Male
  { value: "M18-24", label: "Male 18-24" },
  { value: "M25-29", label: "Male 25-29" },
  { value: "M30-34", label: "Male 30-34" },
  { value: "M35-39", label: "Male 35-39" },
  { value: "M40-44", label: "Male 40-44" },
  { value: "M45-49", label: "Male 45-49" },
  { value: "M50-54", label: "Male 50-54" },
  { value: "M55-59", label: "Male 55-59" },
  { value: "M60-64", label: "Male 60-64" },
  { value: "M65-69", label: "Male 65-69" },
  { value: "M70-74", label: "Male 70-74" },
]