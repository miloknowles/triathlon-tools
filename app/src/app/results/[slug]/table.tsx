"use client";

import { Button, Card, MultiSelect, SearchSelect, MultiSelectItem, Badge, SearchSelectItem } from "@tremor/react";

import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@tremor/react';
import { IronmanData } from "./types";
import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, DownloadIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import AgeGroupMultiSelect from "./AgeGroupMultiSelect";
import { useState } from "react";


const rankSplits = (data: IronmanData[], rankBy: "overall" | "gender" | "group") => {

}


export default function ResultsTable({ data }: { data: IronmanData[] }) {
  const [page, setPage] = useState(0);
  const [rankBy, setRankBy] = useState<string | undefined>("gender");
  const [ageGroups, setAgeGroups] = useState<string[]>(["overall"]);

  const perPage = 10;
  const maxPage = Math.ceil(data.length / perPage);

  const filtered = data.filter((r: any) => {
    if (ageGroups.includes("overall")) return true;
    else if (ageGroups.includes("m-overall") && r.AgeGroup.startsWith("M")) return true;
    else if (ageGroups.includes("f-overall") && r.AgeGroup.startsWith("F")) return true;
    else return ageGroups.includes(r.AgeGroup);
  });

  const rows = filtered.slice(page*perPage, page*perPage + perPage).map((row) => {
    const status = <Badge size="xs">{row.EventStatus}</Badge>;
    const finishBadge = <Badge size="xs">{{
      overall: row.FinishRankOverall,
      group: row.FinishRankGroup,
      gender: row.FinishRankGender,
    }[rankBy || "gender"]}</Badge>
    const swimBadge = <Badge size="xs">{{
      overall: row.SwimRankOverall,
      group: row.SwimRankGroup,
      gender: row.SwimRankGender,
    }[rankBy || "gender"]}</Badge>;
    const bikeBadge = <Badge size="xs">{{
      overall: row.BikeRankOverall,
      group: row.BikeRankGroup,
      gender: row.BikeRankGender,
    }[rankBy || "gender"]}</Badge>
    const runBadge = <Badge size="xs">{{
      overall: row.RunRankOverall,
      group: row.RunRankGroup,
      gender: row.RunRankGender,
    }[rankBy || "gender"]}</Badge>;

    return (
      <TableRow key={row.Contact.FullName + row.AgeGroup}>
        <TableCell>{row.Contact.FullName || "?"} ({row.CountryISO2})</TableCell>
        <TableCell>{row.AgeGroup}</TableCell>
        <TableCell>{row.EventStatus === "Finish" ? <>{row.FinishTimeConverted} {finishBadge}</> : status}</TableCell>
        <TableCell>{row.SwimTimeConverted} {swimBadge}</TableCell>
        <TableCell>{row.BikeTimeConverted} {bikeBadge}</TableCell>
        <TableCell>{row.RunTimeConverted} {runBadge}</TableCell>
        <TableCell>{row.Transition1TimeConverted}</TableCell>
        <TableCell>{row.Transition2TimeConverted}</TableCell>
      </TableRow>
    );
  });

  const names = data.filter((row) => row.Contact?.FullName).map((row) => {
    return (
      <MultiSelectItem key={row.Contact.FullName} value={row.Contact.FullName}>
        {row.Contact.FullName}
      </MultiSelectItem>
    );
  }).slice(0, 100);

  const nextPage = () => {
    setPage(Math.min(page + 1, maxPage));
  }

  const prevPage = () => {
    setPage(Math.max(page - 1, 0));
  }

  return (
    <Card className="mt-6">
      <div className="flex gap-3 flex-row">
        <MultiSelect className="" placeholder="Search Athlete(s)" icon={MagnifyingGlassIcon}>
          {names}
        </MultiSelect>
        <AgeGroupMultiSelect className="max-w-[240px]" selected={ageGroups} onChange={setAgeGroups}/>
        <SearchSelect
          className="max-w-[240px]"
          placeholder="Rank Splits By"
          defaultValue="gender"
          icon={ArrowDownIcon}
          value={rankBy}
          // @ts-ignore
          onChange={setRankBy}
        >
          <SearchSelectItem value="gender">Gender</SearchSelectItem>
          <SearchSelectItem value="overall">Overall</SearchSelectItem>
          <SearchSelectItem value="group">Age Group</SearchSelectItem>
        </SearchSelect>
        {/* <Button icon={DownloadIcon}>Download</Button> */}
      </div>
      <Table className="mt-3">
        <TableHead>
          <TableRow>
            <TableHeaderCell className="max-w-[200px]">Name</TableHeaderCell>
            <TableHeaderCell>Age Group</TableHeaderCell>
            <TableHeaderCell>Finish</TableHeaderCell>
            <TableHeaderCell>Swim</TableHeaderCell>
            <TableHeaderCell>Bike</TableHeaderCell>
            <TableHeaderCell>Run</TableHeaderCell>
            <TableHeaderCell>T1</TableHeaderCell>
            <TableHeaderCell>T2</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows}
        </TableBody>
      </Table>
      <div className="flex justify-end mt-3 gap-3">
        <Button variant="secondary" icon={ArrowLeftIcon} onClick={prevPage} disabled={page === 0}>Previous</Button>
        <Button icon={ArrowRightIcon} iconPosition="right" onClick={nextPage} disabled={page === maxPage}>Next</Button>
      </div>
    </Card>
  );
}
