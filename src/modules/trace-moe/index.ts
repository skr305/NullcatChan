import { z } from "zod"
import Module from "@/module"
import autobind from "autobind-decorator"
import Message from "@/message"
import fetch from "node-fetch"


export default class extends Module {
    public readonly name = "trace-moe"

    private readonly itemSchema = z.object({
        anilist: z.number(),
        filename: z.string(),
        episode: z.number(),
        from: z.number(),
        to: z.number(),
        similarity: z.number(),
        video: z.string().url(),
        image: z.string().url(),
    })

    private readonly schema = z.object({
        frameCount: z.number(),
        error: z.string(),
        result: z.array(this.itemSchema),
    })

    @autobind
    public install() {
        return {
            mentionHook: this.mentionHook
        }
    }

    @autobind
    private async mentionHook(message: Message) {
        if (!message.includes(["アニメ"])) return false

        const filteredImageFiles = message.files.filter(file => file.type.startsWith("image"))

        if (!filteredImageFiles.length) {
						this.log("ファイルが不良品")
            return false
        }

        const targetImage = filteredImageFiles[0]

        let anilistId: number

        try {
            const response = await fetch(`https://api.trace.moe/search?url=${encodeURIComponent(targetImage.url)}`)

						const data = await response.json()
						const result = this.schema.safeParse(data)

						if (!result.success) {
        				this.log("Validation failed.")
								console.warn(result.error)
								return false
						}

						const firstData = result.data.result[0]
						anilistId = firstData.anilist

        } catch (error) {
            	this.log("Failed to fetch status from Trace Moe.")
            	console.warn(error)
            	return false
        }

        const graphql = JSON.stringify({
							query: "query ($id: Int) { \n  Media (id: $id, type: ANIME) { \n    id\n    title {\n      native\n        }\n    }\n}",
            	variables: { id: anilistId }
        })

        const requestOptions = {
            	method: "POST",
            	body: graphql,
            	redirect: "follow"
        }

				try {
						const response = await fetch("https://graphql.anilist.co/", requestOptions)

						const result = await response.json()
						const native = result.data.Media.id.title.native

						if (!native) {
								return false
						}

						await message.reply(`僕の名前はぬるきゃだよ。ちなみに今の画像のアニメは${native}だよ。`)
						return true

				} catch (error) {
						this.log("Failed to fetch status from AniList.")
						console.warn(error)
				}

				return false
    }
}