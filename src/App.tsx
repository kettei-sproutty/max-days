"use client";
import * as z from "zod";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DatePickerWithPresets,
  DatePickerWithRange,
} from "./components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./components/ui/form";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { addDays, differenceInDays } from "date-fns";
import { useCallback, useEffect, useState } from "react";

const formSchema = z.object({
  dates: z.array(z.object({ from: z.date(), to: z.date() })),
  next: z.date(),
});

function App() {
  const getDefaultElements = useCallback(() => {
    try {
      const dates: z.infer<typeof formSchema>['dates'] = JSON.parse(localStorage.getItem('tdc-dates') || "");
      if (dates.length) {
        return dates.map((dateRange) => ({ from: new Date(dateRange.from), to: new Date(dateRange.to) }))
      }

      return []
    } catch (error) {
      localStorage.setItem('tdc-dates', JSON.stringify([]))
      return []
    }
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dates: getDefaultElements(),
      next: new Date(),
    },
  });

  const { fields, append, remove, insert } = useFieldArray({
    control: form.control,
    name: "dates",
  });

  const [nextTravel, setNextTravel] = useState({
    days: 0,
    date: new Date(),
  });

  useEffect(() => {
    localStorage.setItem('tdc-dates', JSON.stringify(form.getValues().dates))
  }, [fields])

  const handleReset = () => {
    remove();
  }

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const referenceDate = new Date(values.next);

    const maxDays = 90;
    const totalDays = values.dates.reduce((totalDays, dateRange) => {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);

      const dateDifference = differenceInDays(toDate, fromDate);

      const daysFromReference = differenceInDays(fromDate, referenceDate);

      if (daysFromReference <= 180) {
        return totalDays + dateDifference + 1;
      }

      return totalDays
    }, 0);

    setNextTravel({
      days: maxDays - totalDays,
      date: addDays(referenceDate, maxDays - totalDays),
    });
  };

  const exportToJSON = () => {
      const jsonData = JSON.stringify(form.getValues().dates, null, 2);

      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'dates.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        remove()
        const data: z.infer<typeof formSchema>['dates'] = JSON.parse(reader.result as string);
        data.forEach((dateRange, index) => {
          insert(index, { from: new Date(dateRange.from), to: new Date(dateRange.to) });
        });
      } catch (error) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(event.target.files?.[0] as Blob);
  }

  return (
    <main className="flex flex-col justify-center items-center space-y-3 p-3">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Calculate Days</CardTitle>
          <CardDescription>
            Calculate how many days you have without asking for a Visa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <Button
              variant={"ghost"}
              className="w-full"
              onClick={() => append({ from: new Date(), to: new Date() })}
            >
              <PlusIcon className="mr-2 h-4 w-4" /> Add new row
            </Button>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <section className="flex flex-col justify-center items-center gap-2 max-w-xs">
                {fields.map((field, index) => (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={`dates.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <div className="flex flex-row items-center justify-between">
                            <span>Travel dates {index + 1}</span>
                            <Button
                              onClick={() => remove(index)}
                              variant="ghost"
                              size="icon"
                              type="button"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </FormLabel>
                        <FormControl>
                          <DatePickerWithRange {...field} />
                        </FormControl>
                        <div className="w-full bg-white" />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <FormField
                  control={form.control}
                  name={`next`}
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Next travel day</FormLabel>
                      <FormControl>
                        <div className="flex flex-row gap-3">
                          <DatePickerWithPresets
                            onChange={field.onChange}
                            value={field.value}
                          />
                          <Button type="submit">Calculate</Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={handleReset} variant="destructive">
            Reset
          </Button>
          <Button variant={"outline"}>
            <label htmlFor="import-json">Import</label>
            <input type="file" id="import-json" onChange={handleImport} accept="*.json" max={1} className="sr-only" />
          </Button>
          <Button onClick={exportToJSON}>
            Export
          </Button>
        </CardFooter>
      </Card>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Your available days</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            You have {nextTravel.days} days available.
          </CardDescription>
          <CardDescription>
            You can return at {Intl.DateTimeFormat().format(nextTravel.date)}.
          </CardDescription>
        </CardContent>
      </Card>
    </main>
  );
}

export default App;
